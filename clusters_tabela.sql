CREATE TABLE IF NOT EXISTS `clusters` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `estado` VARCHAR(60),
    `cluster_id` INT,
    `perfil` VARCHAR(120),
    `score_mvi` FLOAT,
    `score_investimento` FLOAT
);
