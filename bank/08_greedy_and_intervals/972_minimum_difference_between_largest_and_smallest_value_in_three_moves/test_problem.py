from solution import min_difference


def test_min_difference_four_elements():
    assert min_difference([5, 3, 2, 4]) == 0


def test_min_difference_example_two():
    assert min_difference([1, 5, 0, 10, 14]) == 1


def test_min_difference_three_elements():
    assert min_difference([3, 100, 20]) == 0


def test_min_difference_single():
    assert min_difference([7]) == 0


def test_min_difference_keep_top_pair():
    assert min_difference([1, 5, 6, 14, 15]) == 1


def test_min_difference_negatives():
    assert min_difference([-10, -5, 0, 5, 10, 20]) == 10
