from solution import average_waiting_time


def close(a: float, b: float) -> bool:
    return abs(a - b) < 1e-5


def test_average_waiting_time_back_to_back():
    assert close(average_waiting_time([[1, 2], [2, 5], [4, 3]]), 5.0)


def test_average_waiting_time_same_arrivals_and_idle_gap():
    assert close(average_waiting_time([[5, 2], [5, 4], [10, 3], [20, 1]]), 3.25)


def test_average_waiting_time_single_customer():
    assert close(average_waiting_time([[1, 5]]), 5.0)


def test_average_waiting_time_chef_idle_between_orders():
    assert close(average_waiting_time([[1, 1], [10, 1]]), 1.0)


def test_average_waiting_time_queue_builds_up():
    assert close(average_waiting_time([[1, 10], [1, 10], [1, 10]]), 20.0)
