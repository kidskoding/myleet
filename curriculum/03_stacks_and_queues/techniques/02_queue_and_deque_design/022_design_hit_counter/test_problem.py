from solution import HitCounter


def test_hit_counter_counts_within_the_window():
    counter = HitCounter()
    counter.hit(1)
    counter.hit(2)
    counter.hit(3)

    assert counter.get_hits(4) == 3


def test_hit_counter_evicts_old_hits():
    counter = HitCounter()
    counter.hit(1)
    counter.hit(2)
    counter.hit(3)
    counter.hit(300)

    assert counter.get_hits(300) == 4
    assert counter.get_hits(301) == 3


def test_hit_counter_window_fully_expired():
    counter = HitCounter()
    counter.hit(1)

    assert counter.get_hits(601) == 0
