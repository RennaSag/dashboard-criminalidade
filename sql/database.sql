SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;


CREATE TABLE `defesa_civil` (
  `id` int(11) NOT NULL,
  `estado` varchar(60) DEFAULT NULL,
  `ano2022` decimal(15,2) DEFAULT NULL,
  `ano2023` decimal(15,2) DEFAULT NULL,
  `ano2024` decimal(15,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `defesa_civil` (`id`, `estado`, `ano2022`, `ano2023`, `ano2024`) VALUES
(1, 'Acre', 66240462.65, 92970727.00, 105712203.78),
(2, 'Alagoas', 312962.51, 269902.22, 999796.02),
(3, 'Amapá', 7279228.70, 13415842.14, 8736854.49),
(4, 'Amazonas', 20968700.89, 25438355.71, 69305022.31),
(5, 'Bahia', 90594240.57, 63700390.26, 69665107.65),
(6, 'Ceará', 1903914.99, 13749913.30, 2198267.06),
(7, 'Distrito Federal', 103491.80, 8951.98, 23024.35),
(8, 'Espírito Santo', 73739027.37, 64075135.06, 47902817.36),
(9, 'Goiás', 425862594.31, 22078656.24, 34974251.00),
(10, 'Maranhão', 11613188.53, 19583585.44, 8534754.91),
(11, 'Mato Grosso', 85357133.57, 10632913.53, 13084243.38),
(12, 'Mato Grosso do Sul', NULL, 398816.00, NULL),
(13, 'Minas Gerais', 1061171813.03, 903320465.20, 882199994.58),
(14, 'Pará', 48736696.63, 96142844.77, 83762101.89),
(15, 'Paraíba', 25428428.49, 24621946.54, 15724177.95),
(16, 'Paraná', 124410076.29, 130342142.72, 553561070.61),
(17, 'Pernambuco', 287877549.79, 296699738.67, 300593139.63),
(18, 'Piauí', 77917459.90, 43650548.22, 95665437.85),
(19, 'Rio de Janeiro', 191544603.97, 504501787.88, 262738506.52),
(20, 'Rio Grande do Norte', 28463152.88, 34144957.96, 30114610.55),
(21, 'Rio Grande do Sul', 516641288.58, 454781111.26, 529494782.23),
(22, 'Rondônia', 104645982.22, 109407119.80, 148367381.86),
(23, 'Roraima', 8103027.08, 6690193.66, 11785746.44),
(24, 'Santa Catarina', 206155978.17, 146074928.62, 139717409.35),
(25, 'São Paulo', 71441774.00, 97745769.53, 50607509.59),
(26, 'Sergipe', 116715094.59, 111250343.59, 140313136.06),
(27, 'Tocantins', 16650381.73, 6473543.11, 4666368.72);




CREATE TABLE `demais_servicos` (
  `id` int(11) NOT NULL,
  `estado` varchar(60) DEFAULT NULL,
  `ano2022` decimal(16,2) DEFAULT NULL,
  `ano2023` decimal(16,2) DEFAULT NULL,
  `ano2024` decimal(16,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `demais_servicos` (`id`, `estado`, `ano2022`, `ano2023`, `ano2024`) VALUES
(1, 'Acre', 265236851.58, 263486234.52, 293767414.02),
(2, 'Alagoas', 1607102471.86, 1738515853.26, 1959332229.60),
(3, 'Amapá', 861446644.08, 891822511.65, 1008779382.06),
(4, 'Amazonas', 2748961923.41, 2643324692.81, 2978459918.18),
(5, 'Bahia', 4667787774.40, 5002257979.50, 5574421795.56),
(6, 'Ceará', 3932303209.37, 4194506436.06, 4323473358.18),
(7, 'Distrito Federal', 1077657206.38, 1134141601.06, 1304393403.50),
(8, 'Espírito Santo', 1771614091.59, 1832742095.57, 2089479747.73),
(9, 'Goiás', 3044377414.51, 3616118688.70, 3979733144.86),
(10, 'Maranhão', 2024439071.50, 1975344907.43, 2074105047.93),
(11, 'Mato Grosso', 3340038121.71, 3509893628.18, 3689751064.13),
(12, 'Mato Grosso do Sul', 1741158168.78, 1026485983.80, 750065751.81),
(13, 'Minas Gerais', 3603585918.01, 3851225838.70, 3761404782.52),
(14, 'Pará', 3881706280.08, 4222062994.36, 4717908592.85),
(15, 'Paraíba', 1820917989.20, 1879284340.21, 2043982250.33),
(16, 'Paraná', 1554907028.50, 1873617439.14, 1915394618.13),
(17, 'Pernambuco', 243862941.05, 223459700.56, 264198252.38),
(18, 'Piauí', 938859193.77, 1035470836.07, 1372097142.63),
(19, 'Rio de Janeiro', 13790493827.23, 14596269331.55, 15285320986.19),
(20, 'Rio Grande do Norte', 1338159634.35, 2245661974.84, 2280034763.16),
(21, 'Rio Grande do Sul', 3203761806.08, 3134611525.39, 3335305329.93),
(22, 'Rondônia', 494557918.35, 538320048.44, 604778948.37),
(23, 'Roraima', 569389648.63, 638542375.30, 705014946.82),
(24, 'Santa Catarina', 2829433488.39, 2836182499.36, 2955970823.71),
(25, 'São Paulo', 1504312627.46, 1542893196.92, 795617083.25),
(26, 'Sergipe', 540200582.52, 523297616.50, 882325298.18),
(27, 'Tocantins', 1112026416.23, 1226729366.13, 1368474799.80);



CREATE TABLE `feminicidio` (
  `id` int(11) NOT NULL,
  `estado` varchar(60) DEFAULT NULL,
  `ano2022` int(11) DEFAULT NULL,
  `ano2023` int(11) DEFAULT NULL,
  `ano2024` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `feminicidio` (`id`, `estado`, `ano2022`, `ano2023`, `ano2024`) VALUES
(1, 'Acre', 9, 10, 8),
(2, 'Alagoas', 31, 18, 22),
(3, 'Amapá', 9, 4, 2),
(4, 'Amazonas', 21, 23, 29),
(5, 'Bahia', 107, 115, 111),
(6, 'Ceará', 29, 42, 41),
(7, 'Distrito Federal', 22, 31, 23),
(8, 'Espírito Santo', 35, 35, 39),
(9, 'Goiás', 55, 56, 56),
(10, 'Maranhão', 69, 50, 69),
(11, 'Mato Grosso', 47, 46, 47),
(12, 'Mato Grosso do Sul', 44, 30, 35),
(13, 'Minas Gerais', 175, 186, 163),
(14, 'Pará', 54, 57, 50),
(15, 'Paraíba', 26, 34, 26),
(16, 'Paraná', 77, 81, 109),
(17, 'Pernambuco', 72, 82, 77),
(18, 'Piauí', 24, 28, 40),
(19, 'Rio de Janeiro', 111, 99, 107),
(20, 'Rio Grande do Norte', 16, 24, 19),
(21, 'Rio Grande do Sul', 111, 85, 72),
(22, 'Rondônia', 23, 21, 13),
(23, 'Roraima', 3, 6, 7),
(24, 'Santa Catarina', 57, 57, 51),
(25, 'São Paulo', 195, 221, 253),
(26, 'Sergipe', 19, 16, 10),
(27, 'Tocantins', 14, 18, 13);



CREATE TABLE `informacoes_e_inteligencia` (
  `id` int(11) NOT NULL,
  `estado` varchar(60) DEFAULT NULL,
  `ano2022` decimal(15,2) DEFAULT NULL,
  `ano2023` decimal(15,2) DEFAULT NULL,
  `ano2024` decimal(15,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `informacoes_e_inteligencia` (`id`, `estado`, `ano2022`, `ano2023`, `ano2024`) VALUES
(1, 'Acre', 322467132.83, 319109947.00, 355481202.59),
(2, 'Alagoas', 75574.26, 99286.10, 1542248.65),
(3, 'Amapá', 63773.94, 190390.00, 624787.30),
(4, 'Amazonas', 320140.84, 156000.00, 41699.70),
(5, 'Bahia', 12137906.37, 22523113.00, 50037831.11),
(6, 'Ceará', 115705896.66, 80383985.64, 32420582.68),
(7, 'Distrito Federal', NULL, NULL, NULL),
(8, 'Espírito Santo', NULL, NULL, NULL),
(9, 'Goiás', 1476173.69, 2429123.83, 14673043.12),
(10, 'Maranhão', NULL, NULL, 0.00),
(11, 'Mato Grosso', 1009608.17, 2813180.40, 18180223.30),
(12, 'Mato Grosso do Sul', NULL, NULL, NULL),
(13, 'Minas Gerais', 47137747.32, 21922345.39, 27909889.37),
(14, 'Pará', 30809902.08, 41806170.59, 54250833.90),
(15, 'Paraíba', 519905.47, 338540.84, 456998.68),
(16, 'Paraná', 834244227.02, 960997724.12, 1082978113.57),
(17, 'Pernambuco', 1439797.05, 1899777.54, 958899.82),
(18, 'Piauí', NULL, NULL, 11595859.61),
(19, 'Rio de Janeiro', 3454160.19, 2219246.08, 15848105.22),
(20, 'Rio Grande do Norte', 3862961.12, 5437.63, 0.00),
(21, 'Rio Grande do Sul', 62728848.03, 69724845.65, 81527906.68),
(22, 'Rondônia', 303765522.63, 288632640.30, 316001431.81),
(23, 'Roraima', 23796727.51, 28114246.66, 30582411.53),
(24, 'Santa Catarina', 94746188.81, 84746308.80, 91335144.18),
(25, 'São Paulo', 505993240.76, 282454802.60, 1256165725.71),
(26, 'Sergipe', 3122.94, NULL, 9242730.14),
(27, 'Tocantins', NULL, NULL, 39670.24);



CREATE TABLE `mvi` (
  `id` int(11) NOT NULL,
  `estado` varchar(60) DEFAULT NULL,
  `ano2022` decimal(5,1) DEFAULT NULL,
  `ano2023` decimal(5,1) DEFAULT NULL,
  `ano2024` decimal(5,1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `mvi` (`id`, `estado`, `ano2022`, `ano2023`, `ano2024`) VALUES
(1, 'Acre', 237.0, 214.0, 179.0),
(2, 'Alagoas', 1187.0, 1210.0, 1141.0),
(3, 'Amapá', 367.0, 519.0, 362.0),
(4, 'Amazonas', 1531.0, 1406.0, 1173.0),
(5, 'Bahia', 6663.0, 6579.0, 6036.0),
(6, 'Ceará', 3123.0, 3114.0, 3467.0),
(7, 'Distrito Federal', 321.0, 311.0, 266.0),
(8, 'Espírito Santo', 1126.0, 1096.0, 980.0),
(9, 'Goiás', 1784.0, 1636.0, 1379.0),
(10, 'Maranhão', 1900.0, 1897.0, 2129.0),
(11, 'Mato Grosso', 1072.0, 1159.0, 1142.0),
(12, 'Mato Grosso do Sul', 568.0, 601.0, 544.0),
(13, 'Minas Gerais', 2936.0, 3050.0, 3214.0),
(14, 'Pará', 3018.0, 2745.0, 2560.0),
(15, 'Paraíba', 1090.0, 1064.0, 1060.0),
(16, 'Paraná', 2595.0, 2263.0, 2170.0),
(17, 'Pernambuco', 3427.0, 3641.0, 3453.0),
(18, 'Piauí', 828.0, 737.0, 685.0),
(19, 'Rio de Janeiro', 4485.0, 4270.0, 3809.0),
(20, 'Rio Grande do Norte', 1212.0, 1042.0, 833.0),
(21, 'Rio Grande do Sul', 2067.0, 1982.0, 1687.0),
(22, 'Rondônia', 551.0, 455.0, 455.0),
(23, 'Roraima', 199.0, 177.0, 133.0),
(24, 'Santa Catarina', 686.0, 674.0, 685.0),
(25, 'São Paulo', 3737.0, 3480.0, 3751.0),
(26, 'Sergipe', 768.0, 689.0, 522.0),
(27, 'Tocantins', 485.0, 430.0, 312.0);



CREATE TABLE `policiamento` (
  `id` int(11) NOT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `ano2022` decimal(15,2) DEFAULT NULL,
  `ano2023` decimal(15,2) DEFAULT NULL,
  `ano2024` decimal(15,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `policiamento` (`id`, `estado`, `ano2022`, `ano2023`, `ano2024`) VALUES
(1, 'Acre', 365449790.66, 373475173.52, 392941266.16),
(2, 'Alagoas', 91305168.18, 172643947.42, 93601959.78),
(3, 'Amapá', 80217297.39, 58917517.30, 69875009.10),
(4, 'Amazonas', 14813436.15, 16587928.96, 14352137.08),
(5, 'Bahia', 750465709.58, 864313608.38, 955931832.52),
(6, 'Ceará', 329843518.09, 341547095.41, 471963973.83),
(7, 'Distrito Federal', 122188673.89, 157707730.15, 178412969.17),
(8, 'Espírito Santo', 506184049.63, 340613880.71, 405223954.50),
(9, 'Goiás', 210390652.52, 246242474.46, 277957730.17),
(10, 'Maranhão', 121352090.56, 134999660.52, 143102500.06),
(11, 'Mato Grosso', 387357622.40, 261403854.21, 494687086.18),
(12, 'Mato Grosso do Sul', 342780118.83, 1168345390.66, 1123874967.68),
(13, 'Minas Gerais', 6942490329.09, 6484260643.41, 6922893292.41),
(14, 'Pará', 332071466.69, 401313757.55, 441400436.46),
(15, 'Paraíba', 16014804.66, 28959302.96, 32933271.97),
(16, 'Paraná', 2827152039.70, 3266813102.26, 2940984917.12),
(17, 'Pernambuco', 2940945234.63, 2874345426.78, 3130184040.04),
(18, 'Piauí', 28987240.87, 117659542.29, 227635106.05),
(19, 'Rio de Janeiro', 548309417.71, 428589543.58, 453785515.88),
(20, 'Rio Grande do Norte', 87128202.32, 72346781.39, 99569139.68),
(21, 'Rio Grande do Sul', 3540788853.40, 3389991679.18, 3631104055.85),
(22, 'Rondônia', 772333708.81, 751138900.90, 881880235.20),
(23, 'Roraima', 62502309.90, 72883048.35, 66774905.71),
(24, 'Santa Catarina', 394478259.61, 217179991.39, 307843931.01),
(25, 'São Paulo', 13444654202.75, 13723319012.96, 14561761829.67),
(26, 'Sergipe', 687357723.20, 681149541.13, 767011914.03),
(27, 'Tocantins', 74116924.74, 71949617.09, 91284046.23);



CREATE TABLE `roubo_furto_celulares` (
  `id` int(11) NOT NULL,
  `estado` varchar(60) DEFAULT NULL,
  `ano2022` decimal(7,1) DEFAULT NULL,
  `ano2023` decimal(7,1) DEFAULT NULL,
  `ano2024` decimal(7,1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `roubo_furto_celulares` (`id`, `estado`, `ano2022`, `ano2023`, `ano2024`) VALUES
(1, 'Acre', 4689.0, 3976.0, 3286.0),
(2, 'Alagoas', 10440.0, 10159.0, 8876.0),
(3, 'Amapá', 8686.0, 6979.0, 5695.0),
(4, 'Amazonas', 40058.0, 39313.0, 35607.0),
(5, 'Bahia', 63311.0, 73662.0, 61702.0),
(6, 'Ceará', 41097.0, 39084.0, 34392.0),
(7, 'Distrito Federal', 28431.0, 25655.0, 22402.0),
(8, 'Espírito Santo', 25679.0, 20673.0, 17296.0),
(9, 'Goiás', 29030.0, 25027.0, 18556.0),
(10, 'Maranhão', 16414.0, 30566.0, 27847.0),
(11, 'Mato Grosso', 10834.0, 8688.0, 10096.0),
(12, 'Mato Grosso do Sul', 4627.0, 7883.0, 6517.0),
(13, 'Minas Gerais', 53643.0, 50544.0, 44826.0),
(14, 'Pará', 58476.0, 53441.0, 50157.0),
(15, 'Paraíba', 4603.0, 5903.0, 5256.0),
(16, 'Paraná', 41569.0, 40723.0, 32368.0),
(17, 'Pernambuco', 45076.0, 46835.0, 45037.0),
(18, 'Piauí', 20551.0, 20132.0, 14199.0),
(19, 'Rio de Janeiro', 46209.0, 48408.0, 58813.0),
(20, 'Rio Grande do Norte', 18376.0, 17849.0, 16005.0),
(21, 'Rio Grande do Sul', 17442.0, 17436.0, 15063.0),
(22, 'Rondônia', 16554.0, 13834.0, 11478.0),
(23, 'Roraima', 3322.0, 3276.0, 2625.0),
(24, 'Santa Catarina', 21861.0, 22091.0, 20600.0),
(25, 'São Paulo', 337150.0, 324116.0, 270488.0),
(26, 'Sergipe', 10285.0, 9138.0, 7576.0),
(27, 'Tocantins', 5263.0, 3806.0, 4041.0);



CREATE TABLE `roubo_furto_veiculos` (
  `id` int(11) NOT NULL,
  `estado` varchar(60) DEFAULT NULL,
  `ano2022` decimal(6,1) DEFAULT NULL,
  `ano2023` decimal(6,1) DEFAULT NULL,
  `ano2024` decimal(6,1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `roubo_furto_veiculos` (`id`, `estado`, `ano2022`, `ano2023`, `ano2024`) VALUES
(1, 'Acre', 1241.0, 1347.0, 839.0),
(2, 'Alagoas', 3781.0, 3827.0, 3219.0),
(3, 'Amapá', 840.0, 550.0, 547.0),
(4, 'Amazonas', 3430.0, 2813.0, 2758.0),
(5, 'Bahia', 19069.0, 19428.0, 17821.0),
(6, 'Ceará', 13601.0, 13875.0, 12224.0),
(7, 'Distrito Federal', 5281.0, 4594.0, 4377.0),
(8, 'Espírito Santo', 7668.0, 6751.0, 5878.0),
(9, 'Goiás', 7031.0, 5614.0, 4413.0),
(10, 'Maranhão', 6793.0, 9112.0, 7558.0),
(11, 'Mato Grosso', 3250.0, 3316.0, 2817.0),
(12, 'Mato Grosso do Sul', 4048.0, 3251.0, 3052.0),
(13, 'Minas Gerais', 28255.0, 27647.0, 28941.0),
(14, 'Pará', 5512.0, 4292.0, 4068.0),
(15, 'Paraíba', 5765.0, 5440.0, 5083.0),
(16, 'Paraná', 17307.0, 15574.0, 13326.0),
(17, 'Pernambuco', 17929.0, 20456.0, 19035.0),
(18, 'Piauí', 6798.0, 6334.0, 5212.0),
(19, 'Rio de Janeiro', 42062.0, 38825.0, 48267.0),
(20, 'Rio Grande do Norte', 6277.0, 5682.0, 5163.0),
(21, 'Rio Grande do Sul', 13359.0, 12149.0, 8916.0),
(22, 'Rondônia', 3998.0, 3289.0, 2654.0),
(23, 'Roraima', 998.0, 983.0, 886.0),
(24, 'Santa Catarina', 9404.0, 8429.0, 7457.0),
(25, 'São Paulo', 99999.9, 99999.9, 99999.9),
(26, 'Sergipe', 2515.0, 1709.0, 1296.0),
(27, 'Tocantins', 1917.0, 1223.0, 3097.0);



CREATE TABLE `trafico_de_drogas` (
  `id` int(11) NOT NULL,
  `estado` varchar(60) DEFAULT NULL,
  `ano2022` int(11) DEFAULT NULL,
  `ano2023` int(11) DEFAULT NULL,
  `ano2024` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `trafico_de_drogas` (`id`, `estado`, `ano2022`, `ano2023`, `ano2024`) VALUES
(1, 'Acre', 802, 752, 843),
(2, 'Alagoas', 1155, 1119, 1085),
(3, 'Amapá', 820, 777, 1007),
(4, 'Amazonas', 1816, 2354, 2271),
(5, 'Bahia', 6412, 6702, 6737),
(6, 'Ceará', 4764, 5492, 5606),
(7, 'Distrito Federal', 2167, 2354, 2462),
(8, 'Espírito Santo', 4642, 4484, 4739),
(9, 'Goiás', 4951, 4527, 5656),
(10, 'Maranhão', 1511, 1643, 1636),
(11, 'Mato Grosso', 4255, 4087, 4553),
(12, 'Mato Grosso do Sul', 4028, 3799, 4071),
(13, 'Minas Gerais', 27082, 29581, 23814),
(14, 'Pará', 4866, 5877, 5332),
(15, 'Paraíba', 1055, 1551, 2349),
(16, 'Paraná', 10123, 12260, 13447),
(17, 'Pernambuco', 10191, 10021, 9134),
(18, 'Piauí', 1212, 1740, 1983),
(19, 'Rio de Janeiro', 9738, 9582, 10752),
(20, 'Rio Grande do Norte', 1371, 1691, 2178),
(21, 'Rio Grande do Sul', 16290, 16090, 16622),
(22, 'Rondônia', 1342, 1408, 1202),
(23, 'Roraima', 470, 532, 455),
(24, 'Santa Catarina', 5841, 5724, 5874),
(25, 'São Paulo', 33682, 35784, 37753),
(26, 'Sergipe', 1025, 1466, 1379),
(27, 'Tocantins', 755, 1013, 890);



ALTER TABLE `defesa_civil`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `demais_servicos`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `feminicidio`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `informacoes_e_inteligencia`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `mvi`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `policiamento`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `roubo_furto_celulares`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `roubo_furto_veiculos`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `trafico_de_drogas`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `defesa_civil`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;


ALTER TABLE `demais_servicos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;


ALTER TABLE `feminicidio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;


ALTER TABLE `informacoes_e_inteligencia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;


ALTER TABLE `mvi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;


ALTER TABLE `policiamento`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;


ALTER TABLE `roubo_furto_celulares`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;


ALTER TABLE `roubo_furto_veiculos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;


ALTER TABLE `trafico_de_drogas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
