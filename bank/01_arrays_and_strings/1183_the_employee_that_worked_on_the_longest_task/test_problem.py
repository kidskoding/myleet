from solution import hardest_worker


def test_hardest_worker_last_task_longest():
    assert hardest_worker(10, [[0, 3], [2, 5], [0, 9], [1, 15]]) == 1


def test_hardest_worker_middle_task_longest():
    assert hardest_worker(26, [[1, 1], [3, 7], [2, 12], [7, 17]]) == 3


def test_hardest_worker_tie_smallest_id():
    assert hardest_worker(2, [[0, 10], [1, 20]]) == 0


def test_hardest_worker_single_task():
    assert hardest_worker(5, [[4, 7]]) == 4


def test_hardest_worker_tie_later_smaller_id():
    assert hardest_worker(4, [[3, 5], [1, 10]]) == 1
