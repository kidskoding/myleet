from solution import MajorityChecker


def test_majority_checker_example():
    checker = MajorityChecker([1, 1, 2, 2, 1, 1])
    assert checker.query(0, 5, 4) == 1
    assert checker.query(0, 3, 3) == -1
    assert checker.query(2, 3, 2) == 2


def test_majority_checker_single_element():
    checker = MajorityChecker([7])
    assert checker.query(0, 0, 1) == 7


def test_majority_checker_threshold_equals_length():
    checker = MajorityChecker([3, 3, 3, 4])
    assert checker.query(0, 2, 3) == 3
    assert checker.query(0, 3, 4) == -1


def test_majority_checker_majority_below_threshold():
    checker = MajorityChecker([5, 5, 6, 5, 6])
    assert checker.query(0, 4, 3) == 5
    assert checker.query(0, 4, 4) == -1


def test_majority_checker_no_majority_candidate_rejected():
    checker = MajorityChecker([1, 2, 3, 1, 2, 3])
    assert checker.query(0, 5, 4) == -1
    assert checker.query(1, 2, 2) == -1
    assert checker.query(3, 3, 1) == 1
