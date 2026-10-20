from solution import maximal_rectangle


def test_maximal_rectangle_normal():
    matrix = [
        ["1", "0", "1", "0", "0"],
        ["1", "0", "1", "1", "1"],
        ["1", "1", "1", "1", "1"],
        ["1", "0", "0", "1", "0"],
    ]

    assert maximal_rectangle(matrix) == 6


def test_maximal_rectangle_all_zero():
    assert maximal_rectangle([["0"]]) == 0


def test_maximal_rectangle_single_one():
    assert maximal_rectangle([["1"]]) == 1
