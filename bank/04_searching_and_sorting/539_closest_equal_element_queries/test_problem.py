from solution import solve_queries


def test_solve_queries_example():
    assert solve_queries([1, 3, 1, 4, 1, 3, 2], [0, 3, 5]) == [2, -1, 3]


def test_solve_queries_all_distinct():
    assert solve_queries([1, 2, 3, 4], [0, 1, 2, 3]) == [-1, -1, -1, -1]


def test_solve_queries_wraps_around():
    assert solve_queries([5, 1, 2, 3, 5], [0, 4]) == [1, 1]


def test_solve_queries_all_equal():
    assert solve_queries([7, 7, 7], [0, 1, 2]) == [1, 1, 1]


def test_solve_queries_single_element():
    assert solve_queries([9], [0]) == [-1]


def test_solve_queries_pair_far_apart_in_line_close_on_circle():
    assert solve_queries([4, 0, 0, 0, 0, 0, 4, 1], [0, 6]) == [2, 2]
