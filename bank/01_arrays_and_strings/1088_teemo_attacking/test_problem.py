from solution import find_poisoned_duration


def test_find_poisoned_duration_no_overlap():
    assert find_poisoned_duration([1, 4], 2) == 4


def test_find_poisoned_duration_overlap_resets():
    assert find_poisoned_duration([1, 2], 2) == 3


def test_find_poisoned_duration_single_attack():
    assert find_poisoned_duration([5], 3) == 3


def test_find_poisoned_duration_zero_duration():
    assert find_poisoned_duration([1, 2], 0) == 0


def test_find_poisoned_duration_same_second_attacks():
    assert find_poisoned_duration([1, 1, 1], 2) == 2


def test_find_poisoned_duration_chain_of_overlaps():
    assert find_poisoned_duration([1, 2, 3, 4, 5], 5) == 9
