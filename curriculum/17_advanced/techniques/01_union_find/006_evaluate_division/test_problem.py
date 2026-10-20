from solution import calc_equation


def test_calc_equation_normal():
    equations = [["a", "b"], ["b", "c"]]
    queries = [["a", "c"], ["b", "a"], ["a", "e"], ["a", "a"], ["x", "x"]]

    assert calc_equation(equations, [2.0, 3.0], queries) == [6.0, 0.5, -1.0, 1.0, -1.0]


def test_calc_equation_single_pair():
    result = calc_equation([["a", "b"]], [2.0], [["a", "b"], ["b", "a"]])

    assert result == [2.0, 0.5]


def test_calc_equation_unknown_variable():
    assert calc_equation([["a", "b"]], [2.0], [["a", "c"]]) == [-1.0]
