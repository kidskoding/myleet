from solution import total_n_queens


def test_total_n_queens_n_equals_four():
    assert total_n_queens(4) == 2


def test_total_n_queens_n_equals_one():
    assert total_n_queens(1) == 1
