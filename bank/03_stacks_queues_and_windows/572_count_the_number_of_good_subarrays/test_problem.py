from solution import count_good


def test_count_good_whole_array_only():
    assert count_good([1, 1, 1, 1, 1], 10) == 1


def test_count_good_example_two():
    assert count_good([3, 1, 4, 3, 2, 2, 4], 2) == 4


def test_count_good_no_pairs():
    assert count_good([1, 2, 3], 1) == 0


def test_count_good_one_pair():
    assert count_good([2, 2], 1) == 1


def test_count_good_three_equal():
    assert count_good([1, 1, 1], 1) == 3
