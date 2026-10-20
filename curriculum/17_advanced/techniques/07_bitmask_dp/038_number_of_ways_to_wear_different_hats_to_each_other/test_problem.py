from solution import number_ways


def test_number_ways_single_assignment():
    assert number_ways([[3, 4], [4, 5], [5]]) == 1


def test_number_ways_several_assignments():
    assert number_ways([[3, 5, 1], [3, 5]]) == 4


def test_number_ways_five_people():
    hats = [[1, 2, 3], [2, 3, 5, 6], [1, 3, 7, 9], [1, 8, 9], [2, 5, 7]]
    assert number_ways(hats) == 111
