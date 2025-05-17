using Microsoft.AspNetCore.Mvc;

namespace GRAL.API.Controllers
{
    [ApiController]
    [Route("api/computation")]
    public class ComputationController : ControllerBase
    {
        private readonly string _computationPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "computation");

        [HttpGet("files")]
        public IActionResult GetFiles()
        {
            if (!Directory.Exists(_computationPath))
                return NotFound("Computation folder not found");
            var files = Directory.GetFiles(_computationPath)
                .Select(Path.GetFileName)
                .ToArray();
            return Ok(files);
        }

        [HttpGet("download/{fileName}")]
        public IActionResult DownloadFile(string fileName)
        {
            var filePath = Path.Combine(_computationPath, fileName);
            if (!System.IO.File.Exists(filePath))
                return NotFound();
            var contentType = "application/octet-stream";
            return PhysicalFile(filePath, contentType, fileName);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFiles([FromForm] List<IFormFile> files)
        {
            if (!Directory.Exists(_computationPath))
                Directory.CreateDirectory(_computationPath);

            foreach (var file in files)
            {
                var filePath = Path.Combine(_computationPath, file.FileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);
            }
            return Ok();
        }
    }
} 