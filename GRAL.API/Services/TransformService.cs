using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GeoAPI.CoordinateSystems.Transformations;
using ProjNet.CoordinateSystems;
using ProjNet.CoordinateSystems.Transformations;

namespace GRAL.API.Services
{
    public interface ITransformService
    {
        Task TransformRastersAsync(string computationPath);
    }

    public class TransformService : ITransformService
    {
        private readonly string _computationPath;
        private readonly ICoordinateTransformation _transformer;

        public TransformService()
        {
            _computationPath = Path.Combine(Directory.GetCurrentDirectory(), "computation");
            
            // Создаем трансформер из EPSG:3857 в EPSG:4326
            var source = ProjectedCoordinateSystem.WebMercator;
            var target = GeographicCoordinateSystem.WGS84;
            _transformer = new CoordinateTransformationFactory()
                .CreateFromCoordinateSystems(source, target);
        }

        public async Task TransformRastersAsync(string computationPath)
        {
            var rasterFiles = Directory.GetFiles(_computationPath, "*-101.txt");

            foreach (var rasterFile in rasterFiles)
            {
                await TransformRasterFileAsync(rasterFile);
            }
        }

        private async Task TransformRasterFileAsync(string filePath)
        {
            try
            {
                var lines = await File.ReadAllLinesAsync(filePath);
                var header = new Dictionary<string, double>();
                var data = new List<List<double>>();
                var headerKeys = new[] { "ncols", "nrows", "xllcorner", "yllcorner", "cellsize", "NODATA_value" };

                // Парсим заголовок и данные
                foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l)))
                {
                    var parts = line.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                    if (!parts.Any()) continue;

                    if (headerKeys.Contains(parts[0]))
                    {
                        header[parts[0]] = double.Parse(parts[1]);
                }
                    else
                    {
                        data.Add(parts.Select(double.Parse).ToList());
                    }
                }

                var ncols = (int)header["ncols"];
                var nrows = (int)header["nrows"];
                var xllcorner = header["xllcorner"];
                var yllcorner = header["yllcorner"];
                var cellsize = header["cellsize"];
                var nodata = header["NODATA_value"];

                var heatData = new List<double[]>();
                for (int i = 0; i < nrows; i++)
                {
                    for (int j = 0; j < ncols; j++)
                    {
                        var value = data[i][j];
                        if (value == nodata || value == 0) continue;

                        // Точка центра ячейки
                        var x = xllcorner + (j + 0.5) * cellsize;
                        var y = yllcorner + (nrows - i - 0.5) * cellsize;  // Ключевое изменение!

                        // Конвертация в EPSG:4326
                        var transformed = _transformer.MathTransform.Transform(new[] { x, y });
                        var lon = transformed[0];
                        var lat = transformed[1];

                        heatData.Add(new[] { lat, lon, value });
                    }
                }

                // Сохраняем результат
                var outputPath = Path.ChangeExtension(filePath, "result_4326.geojson");
                var json = JsonSerializer.Serialize(heatData, new JsonSerializerOptions
                {
                    WriteIndented = true
                });
                await File.WriteAllTextAsync(outputPath, json);
            }
            catch (Exception ex)
            {
                // Логируем ошибку, но продолжаем обработку других файлов
                Console.WriteLine($"Ошибка при обработке файла {filePath}: {ex.Message}");
            }
        }
    }
} 