from solution import max_frequency_elements


def test_max_frequency_elements_two_winners():
    assert max_frequency_elements([1, 2, 2, 3, 1, 4]) == 4


def test_max_frequency_elements_all_distinct():
    assert max_frequency_elements([1, 2, 3, 4, 5]) == 5


def test_max_frequency_elements_single():
    assert max_frequency_elements([7]) == 1


def test_max_frequency_elements_one_winner():
    assert max_frequency_elements([3, 3, 3, 1, 1, 2]) == 3
