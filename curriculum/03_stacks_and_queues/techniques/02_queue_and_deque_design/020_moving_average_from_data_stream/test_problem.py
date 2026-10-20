from solution import MovingAverage


def test_moving_average_window_slides():
    average = MovingAverage(3)

    assert average.next(1) == 1.0
    assert average.next(10) == 5.5
    assert average.next(3) == 14 / 3
    assert average.next(5) == 6.0


def test_moving_average_window_of_one():
    average = MovingAverage(1)

    assert average.next(5) == 5.0
    assert average.next(10) == 10.0


def test_moving_average_before_window_fills():
    average = MovingAverage(5)

    assert average.next(4) == 4.0
    assert average.next(6) == 5.0
