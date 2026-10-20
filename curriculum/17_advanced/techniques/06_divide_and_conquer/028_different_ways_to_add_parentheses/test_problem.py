from solution import diff_ways_to_compute


def test_diff_ways_to_compute_single_number():
    assert diff_ways_to_compute("2") == [2]


def test_diff_ways_to_compute_normal():
    assert sorted(diff_ways_to_compute("2-1-1")) == [0, 2]


def test_diff_ways_to_compute_mixed_operators():
    assert sorted(diff_ways_to_compute("2*3-4*5")) == sorted([-34, -14, -10, -10, 10])
