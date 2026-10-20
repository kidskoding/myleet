from solution import solve_n_queens


def test_solve_n_queens_n_equals_one():
    assert solve_n_queens(1) == [["Q"]]


def test_solve_n_queens_n_equals_two_no_solution():
    assert solve_n_queens(2) == []


def test_solve_n_queens_n_equals_four_count():
    assert len(solve_n_queens(4)) == 2
