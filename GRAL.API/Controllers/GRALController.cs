using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using System.IO;
using System.Threading;
using ProgramGralCore = GRAL_2001.Program;

namespace GRAL.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GRALController : ControllerBase
    {
        private readonly ILogger<GRALController> _logger;
        private static bool _isSimulationRunning = false;
        private static CancellationTokenSource _cancellationTokenSource;

        public GRALController(ILogger<GRALController> logger)
        {
            _logger = logger;
        }

        [HttpPost("run-simulation")]
        public async Task<IActionResult> RunSimulation([FromBody] SimulationParameters parameters)
        {
            if (_isSimulationRunning)
            {
                return BadRequest(new { error = "Симуляция уже запущена" });
            }

            try
            {
                _isSimulationRunning = true;
                _cancellationTokenSource = new CancellationTokenSource();

                // Установка рабочей директории
                if (!string.IsNullOrEmpty(parameters.OutputDirectory))
                {
                    Directory.SetCurrentDirectory(parameters.OutputDirectory);
                }

                // Устанавливаем CancellationTokenSource в GRAL
                ProgramGralCore.SetCancellationTokenSource(_cancellationTokenSource);

                // Запуск симуляции в отдельном потоке
                await Task.Run(() =>
                {
                    try
                    {
                        // Запуск симуляции напрямую через Program.Main
                        GRAL_2001.Program.Main(new string[] { parameters.InputFile });
                    }
                    catch (OperationCanceledException)
                    {
                        _logger.LogInformation("Симуляция была отменена пользователем");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Ошибка при выполнении симуляции");
                        throw;
                    }
                }, _cancellationTokenSource.Token);

                return Ok(new { message = "Симуляция успешно запущена", parameters });
            }
            catch (Exception ex)
            {
                _isSimulationRunning = false;
                _logger.LogError(ex, "Ошибка при запуске симуляции");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            return Ok(new { 
                isRunning = _isSimulationRunning,
                status = _isSimulationRunning ? "Выполняется" : "Готов к работе"
            });
        }

        [HttpPost("stop")]
        public IActionResult StopSimulation()
        {
            if (!_isSimulationRunning)
            {
                return BadRequest(new { error = "Нет запущенной симуляции" });
            }

            try
            {
                // Отменяем симуляцию через GRAL
                ProgramGralCore.CancelSimulation();
                
                // Отменяем задачу
                _cancellationTokenSource?.Cancel();
                _isSimulationRunning = false;
                
                return Ok(new { message = "Симуляция остановлена" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при остановке симуляции");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        [HttpPost("configure")]
        public IActionResult ConfigureSimulation([FromBody] ConfigurationParameters config)
        {
            try
            {
                if (!string.IsNullOrEmpty(config.WorkingDirectory))
                {
                    Directory.SetCurrentDirectory(config.WorkingDirectory);
                }

                // Настройка количества потоков
                if (config.MaxThreads > 0)
                {
                    // TODO: Реализовать настройку количества потоков
                }

                return Ok(new { message = "Конфигурация обновлена", config });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при конфигурации симуляции");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
    }

    public class SimulationParameters
    {
        public string InputFile { get; set; }
        public string OutputDirectory { get; set; } = "./";
        public Dictionary<string, object> AdditionalParameters { get; set; }
    }

    public class ConfigurationParameters
    {
        public int MaxThreads { get; set; }
        public string WorkingDirectory { get; set; }
        public Dictionary<string, object> Settings { get; set; }
    }
} 