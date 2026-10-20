from solution import max_turbulence_size


def test_max_turbulence_size_normal():
    assert max_turbulence_size([9, 4, 2, 10, 7, 8, 8, 1, 9]) == 5


def test_max_turbulence_size_monotonic():
    assert max_turbulence_size([4, 8, 12, 16]) == 2


def test_max_turbulence_size_single():
    assert max_turbulence_size([100]) == 1
