using Microsoft.AspNetCore.Mvc;
using GRAL.API.Services;
using GRAL.API.Models;


namespace GRAL.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ComputationController : ControllerBase
    {
        private readonly IComputationService _computationService;

        public ComputationController(IComputationService computationService)
        {
            _computationService = computationService;
        }

        [HttpPost("point-dat")]
        public async Task<IActionResult> SavePointDat([FromBody] PointDatModel model)
        {
            try
            {
                await _computationService.SavePointDatAsync(model);
                return Ok(new { message = "Файл point.dat успешно сохранен" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("mettimeseries")]
        public async Task<IActionResult> SaveMettseries([FromBody] List<MettseriesRecord> records)
        {
            try
            {
                await _computationService.SaveMettseriesAsync(records);
                return Ok(new { message = "Файл mettimeseries.dat успешно сохранен" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("gral-geb")]
        public async Task<IActionResult> SaveGralGeb([FromBody] GralGebModel model)
        {
            try
            {
                await _computationService.SaveGralGebAsync(model);
                return Ok(new { message = "Файл GRAL.geb успешно сохранен" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("pollutant")]
        public async Task<IActionResult> SavePollutant([FromBody] PollutantModel model)
        {
            try
            {
                await _computationService.SavePollutantAsync(model);
                return Ok(new { message = "Файл Pollutant.txt успешно сохранен" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("save-all")]
        public async Task<IActionResult> SaveAllFiles([FromBody] SaveAllFilesModel model)
        {
            try
            {
                await _computationService.SaveAllFilesAsync(model);
                return Ok(new { message = "Все файлы успешно сохранены" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
} 