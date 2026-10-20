from solution import two_out_of_three


def test_two_out_of_three_example_one():
    assert sorted(two_out_of_three([1, 1, 3, 2], [2, 3], [3])) == [2, 3]


def test_two_out_of_three_each_pair():
    assert sorted(two_out_of_three([3, 1], [2, 3], [1, 2])) == [1, 2, 3]


def test_two_out_of_three_none_shared():
    assert two_out_of_three([1, 2, 2], [4, 3, 3], [5]) == []


def test_two_out_of_three_in_all_three():
    assert two_out_of_three([5], [5], [5]) == [5]


def test_two_out_of_three_duplicates_in_one_array_only():
    assert two_out_of_three([7, 7], [1], [2]) == []
