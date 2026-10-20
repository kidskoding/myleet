from solution import Logger


def run(calls: list[tuple[int, str]]) -> list[bool]:
    logger = Logger()
    return [logger.should_print_message(timestamp, message) for timestamp, message in calls]


def test_should_print_message_basic_window():
    calls = [(1, "foo"), (2, "bar"), (3, "foo"), (8, "bar"), (10, "foo"), (11, "foo")]
    assert run(calls) == [True, True, False, False, False, True]


def test_should_print_message_rejected_call_does_not_reset_window():
    assert run([(0, "a"), (5, "a"), (10, "a")]) == [True, False, True]


def test_should_print_message_messages_are_independent():
    assert run([(1, "x"), (1, "y"), (2, "x"), (2, "z")]) == [True, True, False, True]


def test_should_print_message_same_timestamp_duplicate():
    assert run([(1, "x"), (1, "x")]) == [True, False]


def test_should_print_message_single_call():
    assert run([(100, "hello")]) == [True]
