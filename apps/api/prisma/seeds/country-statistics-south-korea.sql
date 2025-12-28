-- ============================================================================
-- 대한민국 국가 통계 데이터 (2014-2024)
-- ============================================================================
-- 국가 ID를 먼저 조회하여 변수에 저장
-- 실제 사용 시 대한민국의 실제 UUID로 교체 필요

-- ============================================================================
-- 1. 경제 지표 (CountryEconomicIndicator)
-- ============================================================================
INSERT INTO `country_economic_indicator` (
  `id`, `country_id`, `year`,
  `gdp`, `gdp_per_capita`, `gdp_growth_rate`,
  `inflation_rate`, `unemployment_rate`,
  `trade_balance`, `government_debt`, `debt_to_gdp_ratio`,
  `created_at`, `updated_at`
) VALUES
-- 2024년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2024,
 1811000000000, 34980, 2.3,
 2.3, 2.8,
 45000000000, 985000000000, 54.4,
 NOW(), NOW()),

-- 2023년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2023,
 1721000000000, 33390, 1.4,
 3.6, 2.7,
 42000000000, 952000000000, 55.3,
 NOW(), NOW()),

-- 2022년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2022,
 1673000000000, 32422, 2.6,
 5.1, 2.9,
 48000000000, 926000000000, 55.3,
 NOW(), NOW()),

-- 2021년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2021,
 1810000000000, 35195, 4.3,
 2.5, 3.7,
 41000000000, 905000000000, 50.0,
 NOW(), NOW()),

-- 2020년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2020,
 1637000000000, 31637, -0.9,
 0.5, 4.0,
 39000000000, 872000000000, 53.3,
 NOW(), NOW()),

-- 2019년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2019,
 1647000000000, 31846, 2.2,
 0.4, 3.8,
 44000000000, 835000000000, 50.7,
 NOW(), NOW()),

-- 2018년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2018,
 1725000000000, 33346, 2.9,
 1.5, 3.8,
 75000000000, 815000000000, 47.3,
 NOW(), NOW()),

-- 2017년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2017,
 1623000000000, 31362, 3.2,
 1.9, 3.7,
 79000000000, 789000000000, 48.6,
 NOW(), NOW()),

-- 2016년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2016,
 1500000000000, 29000, 2.9,
 1.0, 3.7,
 89000000000, 765000000000, 51.0,
 NOW(), NOW()),

-- 2015년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2015,
 1466000000000, 28350, 2.8,
 0.7, 3.6,
 84000000000, 742000000000, 50.6,
 NOW(), NOW()),

-- 2014년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2014,
 1485000000000, 28739, 3.2,
 1.3, 3.5,
 88000000000, 725000000000, 48.8,
 NOW(), NOW());

-- ============================================================================
-- 2. 인구 지표 (CountryDemographicIndicator)
-- ============================================================================
INSERT INTO `country_demographic_indicator` (
  `id`, `country_id`, `year`,
  `population`, `population_growth_rate`, `population_density`,
  `birth_rate`, `death_rate`, `fertility_rate`, `median_age`,
  `population_age_0_to_14`, `population_age_15_to_64`, `population_age_65_plus`,
  `urban_population`, `urbanization_rate`,
  `life_expectancy`, `life_expectancy_male`, `life_expectancy_female`,
  `created_at`, `updated_at`
) VALUES
-- 2024년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2024,
 51780579, 0.05, 517.0,
 5.7, 6.2, 0.72, 44.5,
 11.8, 70.5, 17.7,
 42000000, 81.4,
 83.7, 80.5, 86.9,
 NOW(), NOW()),

-- 2023년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2023,
 51628117, 0.08, 515.5,
 5.9, 6.0, 0.78, 44.0,
 12.0, 71.0, 17.0,
 41800000, 81.3,
 83.5, 80.3, 86.7,
 NOW(), NOW()),

-- 2022년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2022,
 51628117, 0.09, 515.5,
 6.1, 5.9, 0.81, 43.7,
 12.2, 71.3, 16.5,
 41600000, 81.2,
 83.3, 80.1, 86.5,
 NOW(), NOW()),

-- 2021년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2021,
 51638809, 0.14, 515.6,
 6.4, 5.8, 0.85, 43.4,
 12.5, 71.7, 15.8,
 41500000, 81.4,
 83.3, 80.1, 86.5,
 NOW(), NOW()),

-- 2020년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2020,
 51829023, 0.16, 517.5,
 6.8, 5.9, 0.92, 43.0,
 12.9, 72.1, 15.0,
 41400000, 81.3,
 83.5, 80.3, 86.7,
 NOW(), NOW()),

-- 2019년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2019,
 51709098, 0.21, 516.3,
 7.3, 5.6, 0.98, 42.6,
 13.5, 72.7, 13.8,
 41300000, 81.5,
 83.3, 80.1, 86.5,
 NOW(), NOW()),

-- 2018년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2018,
 51606633, 0.28, 515.2,
 7.7, 5.5, 1.05, 42.1,
 13.9, 73.1, 13.0,
 41100000, 81.4,
 82.7, 79.7, 85.7,
 NOW(), NOW()),

-- 2017년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2017,
 51466201, 0.30, 513.8,
 8.2, 5.4, 1.17, 41.5,
 14.2, 73.4, 12.4,
 40900000, 81.5,
 82.4, 79.4, 85.4,
 NOW(), NOW()),

-- 2016년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2016,
 51302044, 0.34, 512.2,
 8.5, 5.3, 1.24, 41.0,
 14.5, 73.7, 11.8,
 40700000, 81.5,
 82.4, 79.3, 85.5,
 NOW(), NOW()),

-- 2015년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2015,
 51141463, 0.40, 510.6,
 8.9, 5.2, 1.30, 40.5,
 14.8, 73.9, 11.3,
 40500000, 81.8,
 82.3, 79.2, 85.4,
 NOW(), NOW()),

-- 2014년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2014,
 50946972, 0.45, 508.7,
 9.3, 5.1, 1.38, 40.0,
 15.0, 74.2, 10.8,
 40300000, 82.0,
 82.1, 79.0, 85.2,
 NOW(), NOW());

-- ============================================================================
-- 3. 발전 지표 (CountryDevelopmentIndicator)
-- ============================================================================
INSERT INTO `country_development_indicator` (
  `id`, `country_id`, `year`,
  `literacy_rate`, `education_index`, `hdi`,
  `gni_per_capita`, `health_index`,
  `infant_mortality_rate`, `gini_coefficient`,
  `internet_penetration`, `mobile_penetration`,
  `co2_emissions`, `co2_emissions_per_capita`,
  `created_at`, `updated_at`
) VALUES
-- 2024년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2024,
 99.0, 0.932, 0.925,
 35500, 0.952,
 2.7, 31.6,
 96.2, 129.5,
 610000000, 11.8,
 NOW(), NOW()),

-- 2023년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2023,
 99.0, 0.930, 0.922,
 34800, 0.950,
 2.8, 31.4,
 96.0, 128.5,
 620000000, 12.0,
 NOW(), NOW()),

-- 2022년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2022,
 99.0, 0.928, 0.920,
 33200, 0.948,
 2.8, 31.4,
 95.8, 127.5,
 635000000, 12.3,
 NOW(), NOW()),

-- 2021년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2021,
 99.0, 0.925, 0.916,
 35000, 0.950,
 2.8, 31.4,
 95.0, 126.0,
 630000000, 12.2,
 NOW(), NOW()),

-- 2020년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2020,
 99.0, 0.922, 0.912,
 31500, 0.948,
 2.8, 31.6,
 94.5, 125.0,
 610000000, 11.8,
 NOW(), NOW()),

-- 2019년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2019,
 99.0, 0.920, 0.910,
 31800, 0.945,
 2.8, 31.4,
 94.0, 123.5,
 640000000, 12.4,
 NOW(), NOW()),

-- 2018년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2018,
 99.0, 0.918, 0.908,
 32900, 0.943,
 2.9, 31.4,
 93.2, 122.0,
 650000000, 12.6,
 NOW(), NOW()),

-- 2017년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2017,
 99.0, 0.915, 0.905,
 31000, 0.940,
 2.9, 31.6,
 92.8, 120.5,
 660000000, 12.8,
 NOW(), NOW()),

-- 2016년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2016,
 99.0, 0.913, 0.902,
 28800, 0.938,
 3.0, 31.5,
 92.0, 119.0,
 640000000, 12.5,
 NOW(), NOW()),

-- 2015년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2015,
 99.0, 0.910, 0.899,
 28100, 0.935,
 3.0, 31.4,
 91.0, 117.5,
 635000000, 12.4,
 NOW(), NOW()),

-- 2014년
(UUID(), (SELECT id FROM country WHERE name = '대한민국'), 2014,
 99.0, 0.908, 0.896,
 28500, 0.933,
 3.1, 31.6,
 90.0, 116.0,
 630000000, 12.4,
 NOW(), NOW());

