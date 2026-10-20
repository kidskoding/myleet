from solution import full_justify


def test_full_justify_example_one():
    words = ["This", "is", "an", "example", "of", "text", "justification."]
    assert full_justify(words, 16) == ["This    is    an", "example  of text", "justification.  "]


def test_full_justify_example_two():
    words = ["What", "must", "be", "acknowledgment", "shall", "be"]
    assert full_justify(words, 16) == ["What   must   be", "acknowledgment  ", "shall be        "]


def test_full_justify_example_three():
    words = [
        "Science",
        "is",
        "what",
        "we",
        "understand",
        "well",
        "enough",
        "to",
        "explain",
        "to",
        "a",
        "computer.",
        "Art",
        "is",
        "everything",
        "else",
        "we",
        "do",
    ]
    assert full_justify(words, 20) == [
        "Science  is  what we",
        "understand      well",
        "enough to explain to",
        "a  computer.  Art is",
        "everything  else  we",
        "do                  ",
    ]


def test_full_justify_single_word():
    assert full_justify(["hello"], 5) == ["hello"]
    assert full_justify(["hi"], 4) == ["hi  "]


def test_full_justify_uneven_gaps():
    assert full_justify(["a", "b", "c", "d"], 6) == ["a  b c", "d     "]
