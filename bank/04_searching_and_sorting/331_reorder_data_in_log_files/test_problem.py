from solution import reorder_log_files


def test_reorder_log_files_example():
    logs = ["dig1 8 1 5 1", "let1 art can", "dig2 3 6", "let2 own kit dig", "let3 art zero"]
    assert reorder_log_files(logs) == [
        "let1 art can",
        "let3 art zero",
        "let2 own kit dig",
        "dig1 8 1 5 1",
        "dig2 3 6",
    ]


def test_reorder_log_files_second_example():
    logs = ["a1 9 2 3 1", "g1 act car", "zo4 4 7", "ab1 off key dog", "a8 act zoo"]
    assert reorder_log_files(logs) == ["g1 act car", "a8 act zoo", "ab1 off key dog", "a1 9 2 3 1", "zo4 4 7"]


def test_reorder_log_files_same_content_uses_identifier():
    assert reorder_log_files(["let2 art can", "let1 art can"]) == ["let1 art can", "let2 art can"]


def test_reorder_log_files_digit_logs_keep_order():
    assert reorder_log_files(["d2 1", "d1 2", "d3 0"]) == ["d2 1", "d1 2", "d3 0"]


def test_reorder_log_files_single():
    assert reorder_log_files(["x1 abc"]) == ["x1 abc"]
