from solution import min_sensors


def test_min_sensors_five_by_five():
    assert min_sensors(5, 5, 1) == 4


def test_min_sensors_one_covers_all():
    assert min_sensors(2, 2, 2) == 1


def test_min_sensors_single_cell():
    assert min_sensors(1, 1, 0) == 1


def test_min_sensors_zero_range():
    assert min_sensors(3, 4, 0) == 12


def test_min_sensors_large_grid():
    assert min_sensors(1000, 1000, 1) == 111556
