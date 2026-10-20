from solution import SeatManager


def test_seat_manager_example():
    m = SeatManager(5)
    assert m.reserve() == 1
    assert m.reserve() == 2
    m.unreserve(2)
    assert m.reserve() == 2
    assert m.reserve() == 3
    assert m.reserve() == 4
    assert m.reserve() == 5
    m.unreserve(5)


def test_seat_manager_single_seat():
    m = SeatManager(1)
    assert m.reserve() == 1
    m.unreserve(1)
    assert m.reserve() == 1


def test_seat_manager_unreserve_returns_smallest():
    m = SeatManager(4)
    for _ in range(4):
        m.reserve()
    m.unreserve(3)
    m.unreserve(1)
    assert m.reserve() == 1
    assert m.reserve() == 3


def test_seat_manager_sequential():
    m = SeatManager(3)
    assert [m.reserve() for _ in range(3)] == [1, 2, 3]
