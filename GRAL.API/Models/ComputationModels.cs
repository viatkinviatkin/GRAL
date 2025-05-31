namespace GRAL.API.Models
{
    public class PointDatModel
    {
        public int SourceCount { get; set; }
        public int SourceType { get; set; }
        public double SourceHeight { get; set; }
        public double SourceWidth { get; set; }
        public double SourceLength { get; set; }
        public double SourceAngle { get; set; }
        public double SourceX { get; set; }
        public double SourceY { get; set; }
        public double SourceZ { get; set; }
        public double SourceEmission { get; set; }
    }

    public class MettseriesRecord
    {
        public double WindSpeed { get; set; }
        public double WindDirection { get; set; }
        public int StabilityClass { get; set; }
        public double MixingHeight { get; set; }
    }

    public class GralGebModel
    {
        public double CellSizeX { get; set; }
        public double CellSizeY { get; set; }
        public double CellSizeZ { get; set; }
        public double StretchingFactor { get; set; }
        public int CellCountX { get; set; }
        public int CellCountY { get; set; }
        public int HorizontalSlices { get; set; }
        public string SourceGroups { get; set; }
        public double WestBorder { get; set; }
        public double EastBorder { get; set; }
        public double SouthBorder { get; set; }
        public double NorthBorder { get; set; }
    }

    public class PollutantModel
    {
        public string Name { get; set; }
        public int Type { get; set; }
        public double Density { get; set; }
        public double Diameter { get; set; }
        public double DepositionVelocity { get; set; }
    }

    public class SaveAllFilesModel
    {
        public PointDatModel PointDat { get; set; }
        public List<MettseriesRecord> Mettseries { get; set; }
        public GralGebModel GralGeb { get; set; }
        public PollutantModel Pollutant { get; set; }
    }
} 