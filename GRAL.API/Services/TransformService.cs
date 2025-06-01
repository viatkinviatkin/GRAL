using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
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
            var allHeatData = new List<List<double[]>>();

            foreach (var rasterFile in rasterFiles)
            {
                var heatData = await TransformRasterFileAsync(rasterFile);
                if (heatData != null)
                {
                    allHeatData.Add(heatData);
                }
            }

            // Рассчитываем метрики для каждого временного среза
            if (allHeatData.Any())
            {
                for (int i = 0; i < allHeatData.Count; i++)
                {
                    var heatData = allHeatData[i];
                    var metrics = CalculateMetrics(heatData);
                    
                    // Сохраняем метрики для текущего среза
                    var baseFileName = Path.GetFileNameWithoutExtension(rasterFiles[i]);
                    var index = baseFileName.Split('-')[1];

                    // Сохраняем средние значения
                    var meanPath = Path.Combine(_computationPath, $"mean_metrics_{index}.geojson");
                    await File.WriteAllTextAsync(meanPath, JsonSerializer.Serialize(metrics.mean, new JsonSerializerOptions { WriteIndented = true }));

                    // Сохраняем максимальные значения
                    var maxPath = Path.Combine(_computationPath, $"max_metrics_{index}.geojson");
                    await File.WriteAllTextAsync(maxPath, JsonSerializer.Serialize(metrics.max, new JsonSerializerOptions { WriteIndented = true }));

                    // Сохраняем минимальные значения
                    var minPath = Path.Combine(_computationPath, $"min_metrics_{index}.geojson");
                    await File.WriteAllTextAsync(minPath, JsonSerializer.Serialize(metrics.min, new JsonSerializerOptions { WriteIndented = true }));
                }
            }
        }

        private async Task<List<double[]>> TransformRasterFileAsync(string filePath)
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

                return heatData;
            }
            catch (Exception ex)
            {
                // Логируем ошибку, но продолжаем обработку других файлов
                Console.WriteLine($"Ошибка при обработке файла {filePath}: {ex.Message}");
                return null;
            }
        }

        private (object mean, object max, object min) CalculateMetrics(List<double[]> heatData)
        {
            var meanFeatures = new List<object>();
            var maxFeatures = new List<object>();
            var minFeatures = new List<object>();

            // Группируем точки по координатам
            var points = heatData.GroupBy(p => $"{p[0]},{p[1]}");

            foreach (var point in points)
            {
                var coords = point.Key.Split(',');
                var values = point.Select(p => p[2]).ToList();

                var feature = new
                {
                    type = "Feature",
                    geometry = new
                    {
                        type = "Point",
                        coordinates = new[] { double.Parse(coords[1]), double.Parse(coords[0]) }
                    },
                    properties = new
                    {
                        value = values.Average() // для mean
                    }
                };
                meanFeatures.Add(feature);

                feature = new
                {
                    type = "Feature",
                    geometry = new
                    {
                        type = "Point",
                        coordinates = new[] { double.Parse(coords[1]), double.Parse(coords[0]) }
                    },
                    properties = new
                    {
                        value = values.Max() // для max
                    }
                };
                maxFeatures.Add(feature);

                feature = new
                {
                    type = "Feature",
                    geometry = new
                    {
                        type = "Point",
                        coordinates = new[] { double.Parse(coords[1]), double.Parse(coords[0]) }
                    },
                    properties = new
                    {
                        value = values.Min() // для min
                    }
                };
                minFeatures.Add(feature);
            }

            return (
                new { type = "FeatureCollection", features = meanFeatures },
                new { type = "FeatureCollection", features = maxFeatures },
                new { type = "FeatureCollection", features = minFeatures }
            );
        }
    }
} 