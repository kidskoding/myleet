from solution import majority_element_ii


def test_majority_element_ii_one_winner():
    assert sorted(majority_element_ii([3, 2, 3])) == [3]


def test_majority_element_ii_single():
    assert sorted(majority_element_ii([1])) == [1]


def test_majority_element_ii_two_winners():
    assert sorted(majority_element_ii([1, 2])) == [1, 2]


def test_majority_element_ii_excludes_below_threshold():
    assert sorted(majority_element_ii([1, 1, 1, 3, 3, 2, 2, 2])) == [1, 2]
