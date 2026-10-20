from solution import RecentCounter


def test_recent_counter_window():
    counter = RecentCounter()

    assert counter.ping(1) == 1
    assert counter.ping(100) == 2
    assert counter.ping(3001) == 3
    assert counter.ping(3002) == 3


def test_recent_counter_all_within_window():
    counter = RecentCounter()

    assert counter.ping(1) == 1
    assert counter.ping(2) == 2
    assert counter.ping(3) == 3


def test_recent_counter_drops_everything_old():
    counter = RecentCounter()
    counter.ping(1)

    assert counter.ping(10000) == 1
