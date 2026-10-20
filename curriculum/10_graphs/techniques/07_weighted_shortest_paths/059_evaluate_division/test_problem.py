from solution import calc_equation


def test_calc_equation_normal_case():
    equations = [["a", "b"], ["b", "c"]]
    values = [2.0, 3.0]
    queries = [["a", "c"], ["b", "a"], ["a", "e"], ["a", "a"], ["x", "x"]]

    assert calc_equation(equations, values, queries) == [6.0, 0.5, -1.0, 1.0, -1.0]


def test_calc_equation_no_queries_answerable():
    assert calc_equation([["a", "b"]], [1.0], [["c", "d"]]) == [-1.0]
