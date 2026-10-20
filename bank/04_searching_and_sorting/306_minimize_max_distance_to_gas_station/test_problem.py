from solution import minmax_gas_dist

TOLERANCE = 1e-5


def test_minmax_gas_dist_even_spacing():
    assert abs(minmax_gas_dist([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 9) - 0.5) < TOLERANCE


def test_minmax_gas_dist_one_station():
    stations = [23, 24, 36, 39, 46, 56, 57, 65, 84, 98]
    assert abs(minmax_gas_dist(stations, 1) - 14.0) < TOLERANCE


def test_minmax_gas_dist_no_new_stations():
    assert abs(minmax_gas_dist([0, 10], 0) - 10.0) < TOLERANCE


def test_minmax_gas_dist_split_single_gap():
    assert abs(minmax_gas_dist([0, 10], 1) - 5.0) < TOLERANCE


def test_minmax_gas_dist_spreading_beats_focusing():
    assert abs(minmax_gas_dist([0, 4, 10], 2) - 3.0) < TOLERANCE


def test_minmax_gas_dist_non_integer_answer():
    assert abs(minmax_gas_dist([0, 10], 2) - 10 / 3) < TOLERANCE
