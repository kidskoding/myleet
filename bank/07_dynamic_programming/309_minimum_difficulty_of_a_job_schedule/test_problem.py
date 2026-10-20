from solution import min_difficulty


def test_min_difficulty_example():
    assert min_difficulty([6, 5, 4, 3, 2, 1], 2) == 7


def test_min_difficulty_too_few_jobs():
    assert min_difficulty([9, 9, 9], 4) == -1


def test_min_difficulty_one_job_per_day():
    assert min_difficulty([1, 1, 1], 3) == 3


def test_min_difficulty_single_job():
    assert min_difficulty([5], 1) == 5


def test_min_difficulty_alternating():
    assert min_difficulty([7, 1, 7, 1, 7, 1], 3) == 15


def test_min_difficulty_larger():
    assert min_difficulty([11, 111, 22, 222, 33, 333, 44, 444], 6) == 843
