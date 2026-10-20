import pytest
from solution import UndergroundSystem


def test_get_average_time_single_trip():
    system = UndergroundSystem()
    system.check_in(1, "A", 3)
    system.check_out(1, "B", 8)
    assert system.get_average_time("A", "B") == pytest.approx(5.0)


def test_get_average_time_updates_with_new_trips():
    system = UndergroundSystem()
    system.check_in(1, "A", 0)
    system.check_in(2, "A", 5)
    system.check_out(1, "B", 10)
    system.check_out(2, "B", 25)
    assert system.get_average_time("A", "B") == pytest.approx(15.0)
    system.check_in(3, "A", 30)
    system.check_out(3, "B", 60)
    assert system.get_average_time("A", "B") == pytest.approx(20.0)


def test_get_average_time_direction_matters():
    system = UndergroundSystem()
    system.check_in(1, "A", 0)
    system.check_out(1, "B", 4)
    system.check_in(2, "B", 0)
    system.check_out(2, "A", 10)
    assert system.get_average_time("A", "B") == pytest.approx(4.0)
    assert system.get_average_time("B", "A") == pytest.approx(10.0)


def test_get_average_time_same_customer_repeats():
    system = UndergroundSystem()
    system.check_in(7, "X", 0)
    system.check_out(7, "Y", 4)
    system.check_in(7, "X", 10)
    system.check_out(7, "Y", 16)
    assert system.get_average_time("X", "Y") == pytest.approx(5.0)


def test_get_average_time_fractional():
    system = UndergroundSystem()
    for customer, (start, end) in enumerate([(0, 1), (0, 2), (5, 7)]):
        system.check_in(customer, "P", start)
        system.check_out(customer, "Q", end)
    assert system.get_average_time("P", "Q") == pytest.approx(5 / 3)
