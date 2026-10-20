from solution import min_moves


def test_min_moves_no_doubles():
    assert min_moves(5, 0) == 4


def test_min_moves_two_doubles():
    assert min_moves(19, 2) == 7


def test_min_moves_spare_doubles():
    assert min_moves(10, 4) == 4


def test_min_moves_already_at_target():
    assert min_moves(1, 5) == 0


def test_min_moves_large_target_without_doubles():
    assert min_moves(1_000_000_000, 0) == 999_999_999


def test_min_moves_power_of_two():
    assert min_moves(1024, 100) == 10
