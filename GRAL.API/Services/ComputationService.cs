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
        bool AreFilesSaved { get; }
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
        private bool _areFilesSaved;

        public bool AreFilesSaved => _areFilesSaved;

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
            content.AppendLine("Generated: V2019");
            content.AppendLine("x,y,z,H2S[kg/h],--,--,--,exit vel.[m/s],diameter[m],Temp.[K],Source group,deposition parameters F2.5, F10,DiaMax,Density,VDep2.5,VDep10,VDepMax,Dep_Conc");
            content.AppendLine($"{model.X},{model.Y},{model.Z},{model.SourceEmission},0,0,0,{model.ExitVelocity},{model.Diameter},{model.Temperature},{model.SourceGroup},{model.F25},{model.F10},{model.DiaMax},{model.Density},{model.VDep25},{model.VDep10},{model.VDepMax},{model.DepConc}");

            await File.WriteAllTextAsync(Path.Combine(_computationPath, "point.dat"), content.ToString());
        }

        public async Task SaveMettseriesAsync(List<MettseriesRecord> records)
        {
            await EnsureDefaultFilesExist();
            var content = new StringBuilder();
            foreach (var record in records)
            {
                content.AppendLine($"{record.Date},{record.Hour},{record.Velocity},{record.Direction},{record.SC}");
            }

            await File.WriteAllTextAsync(Path.Combine(_computationPath, "mettimeseries.dat"), content.ToString());
            
            // Создаем meteopgt.all на основе mettimeseries.dat
            await CreateMeteopgtAllAsync(records);
        }

        private async Task CreateMeteopgtAllAsync(List<MettseriesRecord> records)
        {
            var content = new StringBuilder();
            
            // Заголовок файла
            content.AppendLine("10,0,10,    !Are dispersion situations classified =0 or not =1");
            content.AppendLine("Wind direction sector,Wind speed class,stability class, frequency");

            // Группируем записи по направлению ветра, скорости и классу стабильности
            var groupedRecords = records
                .GroupBy(r => new { r.Direction, r.Velocity, r.SC })
                .Select(g => new
                {
                    WindDirection = g.Key.Direction,
                    WindSpeed = g.Key.Velocity,
                    StabilityClass = g.Key.SC,
                    Frequency = 500 // Фиксированное значение частоты как в примере
                })
                .OrderBy(r => r.WindDirection)
                .ThenBy(r => r.WindSpeed);

            // Записываем сгруппированные данные
            foreach (var record in groupedRecords)
            {
                content.AppendLine($"{record.WindDirection},{record.WindSpeed},{record.StabilityClass},{record.Frequency}");
            }

            await File.WriteAllTextAsync(Path.Combine(_computationPath, "meteopgt.all"), content.ToString());
        }

        public async Task SaveGralGebAsync(GralGebModel model)
        {
            await EnsureDefaultFilesExist();
            var content = new StringBuilder();
            content.AppendLine($"{model.CellSizeX,-16} !cell-size for cartesian wind field in GRAL in x-direction");
            content.AppendLine($"{model.CellSizeY,-16} !cell-size for cartesian wind field in GRAL in y-direction");
            content.AppendLine($"2,1.01  !cell-size for cartesian wind field in GRAL in z-direction, streching factor for increasing cells heights with height");
            content.AppendLine($"{(int)Math.Abs(model.WestBorder - model.EastBorder)/10} !number of cells for counting grid in GRAL in x-direction");
            content.AppendLine($"{(int)Math.Abs(model.NorthBorder - model.SouthBorder)/10} !number of cells for counting grid in GRAL in y-direction");
            content.AppendLine($"{1,-16} !Number of horizontal slices");
            content.AppendLine($"{model.SourceGroups},  !Source groups to be computed seperated by a comma");
            content.AppendLine($"{model.WestBorder,-16} !West border of GRAL model domain [m]");
            content.AppendLine($"{model.EastBorder,-16} !East border of GRAL model domain [m]");
            content.AppendLine($"{model.SouthBorder,-16} !South border of GRAL model domain [m]");
            content.AppendLine($"{model.NorthBorder,-16} !North border of GRAL model domain [m]");

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
            _areFilesSaved = true;
        }
    }
} 