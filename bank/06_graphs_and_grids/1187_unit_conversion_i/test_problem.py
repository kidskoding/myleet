from solution import base_unit_conversions


def test_base_unit_conversions_chain():
    assert base_unit_conversions([[0, 1, 2], [1, 2, 3]]) == [1, 2, 6]


def test_base_unit_conversions_tree():
    conversions = [[0, 1, 2], [0, 2, 3], [1, 3, 4], [1, 4, 5], [2, 5, 2], [4, 6, 3], [5, 7, 4]]
    assert base_unit_conversions(conversions) == [1, 2, 3, 8, 10, 6, 30, 24]


def test_base_unit_conversions_two_units():
    assert base_unit_conversions([[0, 1, 5]]) == [1, 5]


def test_base_unit_conversions_edges_out_of_order():
    assert base_unit_conversions([[2, 1, 4], [0, 2, 3]]) == [1, 12, 3]


def test_base_unit_conversions_modulo():
    assert base_unit_conversions([[0, 1, 10**9], [1, 2, 10**9]]) == [1, 10**9, 10**18 % (10**9 + 7)]
