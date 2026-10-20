from solution import reverse_words


def run(text: str) -> str:
    chars = list(text)
    assert reverse_words(chars) is None
    return "".join(chars)


def test_reverse_words_sentence():
    assert run("the sky is blue") == "blue is sky the"


def test_reverse_words_single_letter():
    assert run("a") == "a"


def test_reverse_words_single_word():
    assert run("hello") == "hello"


def test_reverse_words_two_words():
    assert run("ab cd") == "cd ab"


def test_reverse_words_mutates_same_list():
    chars = list("one two")
    original = chars
    reverse_words(chars)
    assert original is chars
    assert chars == list("two one")
