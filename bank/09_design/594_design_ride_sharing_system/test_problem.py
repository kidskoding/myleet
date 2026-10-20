from solution import RideSharingSystem


def test_ride_sharing_example_one():
    system = RideSharingSystem()
    system.add_rider(3)
    system.add_driver(2)
    system.add_rider(1)
    assert system.match_driver_with_rider() == [2, 3]
    system.add_driver(5)
    system.cancel_rider(3)
    assert system.match_driver_with_rider() == [5, 1]
    assert system.match_driver_with_rider() == [-1, -1]


def test_ride_sharing_example_two():
    system = RideSharingSystem()
    system.add_rider(8)
    system.add_driver(8)
    system.add_driver(6)
    assert system.match_driver_with_rider() == [8, 8]
    system.add_rider(2)
    system.cancel_rider(2)
    assert system.match_driver_with_rider() == [-1, -1]


def test_ride_sharing_riders_without_drivers():
    system = RideSharingSystem()
    system.add_rider(1)
    system.add_rider(2)
    assert system.match_driver_with_rider() == [-1, -1]
    system.add_driver(9)
    assert system.match_driver_with_rider() == [9, 1]


def test_ride_sharing_cancel_middle_rider():
    system = RideSharingSystem()
    for rider in (1, 2, 3):
        system.add_rider(rider)
    system.cancel_rider(2)
    system.add_driver(10)
    system.add_driver(20)
    assert system.match_driver_with_rider() == [10, 1]
    assert system.match_driver_with_rider() == [20, 3]
    assert system.match_driver_with_rider() == [-1, -1]


def test_ride_sharing_cancel_unknown_rider_is_noop():
    system = RideSharingSystem()
    system.cancel_rider(7)
    system.add_rider(4)
    system.cancel_rider(5)
    system.add_driver(1)
    assert system.match_driver_with_rider() == [1, 4]
