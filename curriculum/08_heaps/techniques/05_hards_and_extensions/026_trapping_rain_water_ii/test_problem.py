from solution import trap_rain_water


def test_trap_rain_water_normal():
    height_map = [[1, 4, 3, 1, 3, 2], [3, 2, 1, 3, 2, 4], [2, 3, 3, 2, 3, 1]]
    assert trap_rain_water(height_map) == 4


def test_trap_rain_water_deep_basin():
    height_map = [
        [3, 3, 3, 3, 3],
        [3, 2, 2, 2, 3],
        [3, 2, 1, 2, 3],
        [3, 2, 2, 2, 3],
        [3, 3, 3, 3, 3],
    ]
    assert trap_rain_water(height_map) == 10
