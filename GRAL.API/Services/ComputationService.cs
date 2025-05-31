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
        private readonly string _defaultSettingsPath;
        private readonly string[] _requiredFiles = new[] 
        {
            "DispNr.txt",
            "emissions001.dat",
            "GRAMMin.dat",
            "in.dat",
            "Max_Proc.txt",
            "meteopgt.all"
        };

        public ComputationService()
        {
            _computationPath = Path.Combine(Directory.GetCurrentDirectory(), "computation");
            _defaultSettingsPath = Path.Combine(Directory.GetCurrentDirectory(), "DefaultComputationSettings");
            
            if (!Directory.Exists(_computationPath))
            {
                Directory.CreateDirectory(_computationPath);
            }
            
            if (!Directory.Exists(_defaultSettingsPath))
            {
                Directory.CreateDirectory(_defaultSettingsPath);
            }
        }

        private async Task EnsureDefaultFilesExist()
        {
            foreach (var file in _requiredFiles)
            {
                var targetPath = Path.Combine(_computationPath, file);
                var defaultPath = Path.Combine(_defaultSettingsPath, file);

                if (!File.Exists(targetPath) && File.Exists(defaultPath))
                {
                    File.Copy(defaultPath, targetPath);
                }
            }
        }

        public async Task SavePointDatAsync(PointDatModel model)
        {
            await EnsureDefaultFilesExist();
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
            await EnsureDefaultFilesExist();
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
            await EnsureDefaultFilesExist();
            var content = new StringBuilder();
            content.AppendLine($"{model.CellSizeX} !cell-size for cartesian wind field in GRAL in x-direction");
            content.AppendLine($"{model.CellSizeY} !cell-size for cartesian wind field in GRAL in y-direction");
            content.AppendLine($"{model.CellSizeZ},{model.StretchingFactor:F2} !cell-size for cartesian wind field in GRAL in z-direction, streching factor for increasing cells heights with height");
            content.AppendLine($"{model.CellCountX} !number of cells for counting grid in GRAL in x-direction");
            content.AppendLine($"{model.CellCountY} !number of cells for counting grid in GRAL in y-direction");
            content.AppendLine($"{model.HorizontalSlices} !Number of horizontal slices");
            content.AppendLine($"{model.SourceGroups} !Source groups to be computed seperated by a comma");
            content.AppendLine($"{model.WestBorder} !West border of GRAL model domain [m]");
            content.AppendLine($"{model.EastBorder} !East border of GRAL model domain [m]");
            content.AppendLine($"{model.SouthBorder} !South border of GRAL model domain [m]");
            content.AppendLine($"{model.NorthBorder} !North border of GRAL model domain [m]");

            await File.WriteAllTextAsync(Path.Combine(_computationPath, "GRAL.geb"), content.ToString());
        }

        public async Task SavePollutantAsync(PollutantModel model)
        {
            await EnsureDefaultFilesExist();
            var content = new StringBuilder();
            content.AppendLine($"{model.Name} !Pollutant name");
            content.AppendLine($"{model.Type} !Pollutant type (1=gas, 2=particle)");
            content.AppendLine($"{model.Density:F2} !Pollutant density [kg/m³]");
            content.AppendLine($"{model.Diameter:F2} !Pollutant diameter [m]");
            content.AppendLine($"{model.DepositionVelocity:F2} !Pollutant deposition velocity [m/s]");

            await File.WriteAllTextAsync(Path.Combine(_computationPath, "Pollutant.txt"), content.ToString());
        }

        public async Task SaveAllFilesAsync(SaveAllFilesModel model)
        {
            await EnsureDefaultFilesExist();
            await SavePointDatAsync(model.PointDat);
            await SaveMettseriesAsync(model.Mettseries);
            await SaveGralGebAsync(model.GralGeb);
            await SavePollutantAsync(model.Pollutant);
        }
    }
} 