using System;
using System.IO;
using System.Threading.Tasks;
using System.Text;
using System.Linq;
using GRAL.API.Models;

namespace GRAL.API.Services
{
    public interface IComputationService
    {
        Task SavePointDatAsync(PointDatModel model);
        Task SaveMettseriesAsync(List<MettseriesRecord> records);
        Task SaveGralGebAsync(GralGebModel model);
        Task SavePollutantAsync(PollutantModel model);
        Task SaveAllFilesAsync(SaveAllFilesModel model);
    }

    public class ComputationService : IComputationService
    {
        private readonly string _computationPath;

        public ComputationService()
        {
            _computationPath = Path.Combine(Directory.GetCurrentDirectory(), "computation");
            if (!Directory.Exists(_computationPath))
            {
                Directory.CreateDirectory(_computationPath);
            }
        }

        public async Task SavePointDatAsync(PointDatModel model)
        {
            var content = new StringBuilder();
            content.AppendLine($"{model.SourceCount} !Number of sources");
            content.AppendLine($"{model.SourceType} !Source type (1=point, 2=line, 3=area)");
            content.AppendLine($"{model.SourceHeight:F2} !Source height [m]");
            content.AppendLine($"{model.SourceWidth:F2} !Source width [m]");
            content.AppendLine($"{model.SourceLength:F2} !Source length [m]");
            content.AppendLine($"{model.SourceAngle:F2} !Source angle [°]");
            content.AppendLine($"{model.SourceX:F2} !Source x-coordinate [m]");
            content.AppendLine($"{model.SourceY:F2} !Source y-coordinate [m]");
            content.AppendLine($"{model.SourceZ:F2} !Source z-coordinate [m]");
            content.AppendLine($"{model.SourceEmission:F2} !Source emission [g/s]");

            await File.WriteAllTextAsync(Path.Combine(_computationPath, "point.dat"), content.ToString());
        }

        public async Task SaveMettseriesAsync(List<MettseriesRecord> records)
        {
            var content = new StringBuilder();
            content.AppendLine($"{records.Count} !Number of records");
            foreach (var record in records)
            {
                content.AppendLine($"{record.WindSpeed:F2} {record.WindDirection:F2} {record.StabilityClass} {record.MixingHeight:F2}");
            }

            await File.WriteAllTextAsync(Path.Combine(_computationPath, "mettimeseries.dat"), content.ToString());
        }

        public async Task SaveGralGebAsync(GralGebModel model)
        {
            var content = new StringBuilder();
            content.AppendLine($"{model.CellSizeX} !cell-size for cartesian wind field in GRAL in x-direction");
            content.AppendLine($"{model.CellSizeY} !cell-size for cartesian wind field in GRAL in y-direction");
            content.AppendLine($"{model.CellSizeZ},{model.StretchingFactor:F2} !cell-size for cartesian wind field in GRAL in z-direction, streching factor for increasing cells heights with height");
            content.AppendLine($"{model.CellCountX} !number of cells for counting grid in GRAL in x-direction");
            content.AppendLine($"{model.CellCountY} !number of cells for counting grid in GRAL in y-direction");
            content.AppendLine($"{model.HorizontalSlices} !Number of horizontal slices");
            content.AppendLine($"{string.Join(",", model.SourceGroups)} !Source groups to be computed seperated by a comma");
            content.AppendLine($"{model.WestBorder} !West border of GRAL model domain [m]");
            content.AppendLine($"{model.EastBorder} !East border of GRAL model domain [m]");
            content.AppendLine($"{model.SouthBorder} !South border of GRAL model domain [m]");
            content.AppendLine($"{model.NorthBorder} !North border of GRAL model domain [m]");

            await File.WriteAllTextAsync(Path.Combine(_computationPath, "GRAL.geb"), content.ToString());
        }

        public async Task SavePollutantAsync(PollutantModel model)
        {
            var content = new StringBuilder();
            content.AppendLine($"{model.PollutantName} !Pollutant name");
            content.AppendLine($"{model.PollutantType} !Pollutant type (1=gas, 2=particle)");
            content.AppendLine($"{model.PollutantDensity:F2} !Pollutant density [kg/m³]");
            content.AppendLine($"{model.PollutantDiameter:F2} !Pollutant diameter [m]");
            content.AppendLine($"{model.PollutantDepositionVelocity:F2} !Pollutant deposition velocity [m/s]");

            await File.WriteAllTextAsync(Path.Combine(_computationPath, "Pollutant.txt"), content.ToString());
        }

        public async Task SaveAllFilesAsync(SaveAllFilesModel model)
        {
            await SavePointDatAsync(model.PointDat);
            await SaveMettseriesAsync(model.Mettseries);
            await SaveGralGebAsync(model.GralGeb);
            await SavePollutantAsync(model.Pollutant);
        }
    }
} 