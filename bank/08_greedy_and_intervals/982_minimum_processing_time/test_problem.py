from solution import min_processing_time


def test_min_processing_time_example_one():
    assert min_processing_time([8, 10], [2, 2, 3, 1, 8, 7, 4, 5]) == 16


def test_min_processing_time_example_two():
    assert min_processing_time([10, 20], [2, 3, 1, 2, 5, 8, 4, 3]) == 23


def test_min_processing_time_single_processor():
    assert min_processing_time([0], [1, 2, 3, 4]) == 4


def test_min_processing_time_unsorted_processors():
    assert min_processing_time([5, 0], [1, 1, 1, 1, 9, 9, 9, 9]) == 9
