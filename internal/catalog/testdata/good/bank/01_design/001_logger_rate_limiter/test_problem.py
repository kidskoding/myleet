from solution import Logger


def test_logger_repeats_after_ten_seconds():
    log = Logger()
    assert log.should_print_message(1, "foo")
    assert not log.should_print_message(3, "foo")
    assert log.should_print_message(11, "foo")
