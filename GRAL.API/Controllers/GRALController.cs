using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using System.IO;
using System.Threading;
using System.Diagnostics;
using ProgramGralCore = GRAL_2001.Program;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GRAL.API.Services;
using System.Linq;

namespace GRAL.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GRALController : ControllerBase
    {
        private readonly ILogger<GRALController> _logger;
        private readonly IConfiguration _configuration;
        private readonly ITransformService _transformService;
        private static Process? _gralProcess;
        private static string _currentStatus = "Idle";
        private static readonly object _statusLock = new object();
        private static readonly string _gralExePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "GRAL.exe");
        private static CancellationTokenSource? _logReaderCts;
        private static Task? _logReaderTask;
        private StreamReader? _logReader;
        private bool _isLogReaderRunning;

        public GRALController(
            ILogger<GRALController> logger,
            IConfiguration configuration,
            ITransformService transformService)
        {
            _logger = logger;
            _configuration = configuration;
            _transformService = transformService;
        }

        [HttpPost("run")]
        public IActionResult RunSimulation([FromBody] SimulationRequest request)
        {
            try
            {
                if (_gralProcess != null && !_gralProcess.HasExited)
                {
                    return BadRequest(new { message = "Simulation is already running", status = _currentStatus });
                }

                if (string.IsNullOrEmpty(request.InputFile))
                {
                    return BadRequest(new { message = "Input file is required" });
                }

                // Устанавливаем рабочую директорию
                string outputDir = Path.GetDirectoryName(request.InputFile) ?? Directory.GetCurrentDirectory();
                Directory.SetCurrentDirectory(outputDir);

                // Запускаем GRAL как отдельный процесс
                var startInfo = new ProcessStartInfo
                {
                    FileName = _gralExePath,
                    Arguments = $"\"{request.InputFile}\"",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                    WorkingDirectory = outputDir
                };


                _gralProcess = Process.Start(startInfo);
                if (_gralProcess == null)
                {
                    throw new Exception("Failed to start GRAL process");
                }

                // Запускаем асинхронное чтение вывода
                _gralProcess.OutputDataReceived += (sender, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        UpdateStatus(e.Data);
                        _logger.LogInformation(e.Data);
                    }
                };
                _gralProcess.ErrorDataReceived += (sender, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        UpdateStatus($"Error: {e.Data}");
                        _logger.LogError(e.Data);
                    }
                };

                _gralProcess.BeginOutputReadLine();
                _gralProcess.BeginErrorReadLine();

                // Запускаем чтение логов
                StartLogReader(outputDir);

                // Запускаем задачу для отслеживания завершения процесса
                Task.Run(async () =>
                {
                    try
                    {
                        var process = _gralProcess;
                        if (process != null)
                        {
                            process.WaitForExit();
                            if (!process.HasExited)
                            {
                                UpdateStatus("Process was terminated unexpectedly");
                            }
                            else if (process.ExitCode != 0)
                            {
                                UpdateStatus($"Process exited with code {process.ExitCode}");
                            }
                            else
                            {
                                UpdateStatus("Simulation completed successfully");
                                try
                                {
                                    // Трансформируем растры после успешного завершения
                                    await _transformService.TransformRastersAsync(process.StartInfo.Arguments);
                                }
                                catch (Exception transformex)
                                {
                                    _logger.LogError(transformex, "Ошибка при обработке выходных файлов");
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        UpdateStatus($"Error monitoring process: {ex.Message}");
                     
                    }
                    finally
                    {
                        StopLogReader();
                        _gralProcess = null;
                    }
                });

                return Ok(new { message = "Simulation started", status = _currentStatus });
            }
            catch (Exception ex)
            {
                _currentStatus = $"Error: {ex.Message}";
                return StatusCode(500, new { message = "Failed to start simulation", error = ex.Message, status = _currentStatus });
            }
        }

        [HttpPost("stop")]
        public IActionResult StopSimulation()
        {
            try
            {
                var process = _gralProcess;
                if (process == null || process.HasExited)
                {
                    return Ok(new { message = "No simulation is running", status = _currentStatus });
                }

                // Отправляем сигнал завершения процессу
                process.Kill();
                process.WaitForExit(5000); // Ждем завершения процесса
                StopLogReader();
                _gralProcess = null;
                _currentStatus = "Simulation stopped";

                return Ok(new { message = "Simulation stopped", status = _currentStatus });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to stop simulation", error = ex.Message, status = _currentStatus });
            }
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            return Ok(new { status = _currentStatus });
        }

        [HttpPost("configure")]
        public IActionResult ConfigureSimulation([FromBody] SimulationConfig config)
        {
            // TODO: Реализовать конфигурацию
            return Ok(new { message = "Configuration updated" });
        }

        [HttpGet("results")]
        public IActionResult GetResults([FromQuery] string computationPath)
        {
            try
            {
                if (string.IsNullOrEmpty(computationPath))
                {
                    return BadRequest(new { message = "Computation path is required" });
                }

                var resultFiles = Directory.GetFiles(computationPath, "*.result_4326.geojson")
                    .Select(f => new
                    {
                        fileName = Path.GetFileName(f),
                        filePath = f
                    })
                    .ToList();

                return Ok(resultFiles);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting result files");
                return StatusCode(500, new { message = "Failed to get result files", error = ex.Message });
            }
        }

        [HttpGet("result/{fileName}")]
        public IActionResult GetResultFile([FromQuery] string computationPath, string fileName)
        {
            try
            {
                if (string.IsNullOrEmpty(computationPath) || string.IsNullOrEmpty(fileName))
                {
                    return BadRequest(new { message = "Computation path and file name are required" });
                }

                var filePath = Path.Combine(computationPath, fileName);
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { message = "Result file not found" });
                }

                var fileContent = System.IO.File.ReadAllText(filePath);
                return Ok(fileContent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading result file");
                return StatusCode(500, new { message = "Failed to read result file", error = ex.Message });
            }
        }

        private void UpdateStatus(string status)
        {
            lock (_statusLock)
            {
                _currentStatus = status;
            }
        }

        private void StartLogReader(string workingDirectory)
        {
            StopLogReader(); // Останавливаем предыдущий читатель, если он есть

            _logReaderCts = new CancellationTokenSource();
            _logReaderTask = Task.Run(async () =>
            {
                var logFilePath = Path.Combine(workingDirectory, "Logfile_GRALCore.txt");
                var lastPosition = 0L;

                while (!_logReaderCts.Token.IsCancellationRequested)
                {
                    try
                    {
                        if (System.IO.File.Exists(logFilePath))
                        {
                            using var fs = new FileStream(logFilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                            if (fs.Length > lastPosition)
                            {
                                fs.Seek(lastPosition, SeekOrigin.Begin);
                                using var reader = new StreamReader(fs);
                                string? line;
                                while ((line = await reader.ReadLineAsync()) != null)
                                {
                                    _logger.LogInformation(line);
                                }
                                lastPosition = fs.Position;
                            }
                        }
                        await Task.Delay(100, _logReaderCts.Token); // Проверяем каждые 100мс
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error reading log file");
                        await Task.Delay(1000, _logReaderCts.Token); // При ошибке ждем подольше
                    }
                }
            }, _logReaderCts.Token);
        }

        private void StopLogReader()
        {
            if (_logReaderCts != null)
            {
                _logReaderCts.Cancel();
                _logReaderCts.Dispose();
                _logReaderCts = null;
            }

            if (_logReaderTask != null)
            {
                try
                {
                    _logReaderTask.Wait(1000); // Ждем завершения задачи
                }
                catch (AggregateException) { } // Игнорируем исключения при отмене
                _logReaderTask = null;
            }
        }
    }

    public class SimulationRequest
    {
        public string InputFile { get; set; }
    }

    public class SimulationConfig
    {
        public int MaxThreads { get; set; }
        public string WorkingDirectory { get; set; }
        public Dictionary<string, object> Settings { get; set; }
    }
} 