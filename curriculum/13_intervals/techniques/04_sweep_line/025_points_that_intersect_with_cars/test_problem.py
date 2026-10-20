from solution import number_of_points


def test_number_of_points_overlapping():
    assert number_of_points([[3, 6], [1, 5], [4, 7]]) == 7


def test_number_of_points_disjoint():
    assert number_of_points([[1, 3], [5, 8]]) == 7
