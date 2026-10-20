from solution import job_scheduling


def test_job_scheduling_normal():
    assert job_scheduling([1, 2, 3, 3], [3, 4, 5, 6], [50, 10, 40, 70]) == 120


def test_job_scheduling_longer():
    start = [1, 2, 3, 4, 6]
    end = [3, 5, 10, 6, 9]
    assert job_scheduling(start, end, [20, 20, 100, 70, 60]) == 150
