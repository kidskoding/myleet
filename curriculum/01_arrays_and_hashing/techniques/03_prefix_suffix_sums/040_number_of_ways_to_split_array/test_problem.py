from solution import ways_to_split_array


def test_ways_to_split_array_normal():
    assert ways_to_split_array([10, 4, -8, 7]) == 2


def test_ways_to_split_array_no_negatives():
    assert ways_to_split_array([2, 3, 1, 0]) == 2
