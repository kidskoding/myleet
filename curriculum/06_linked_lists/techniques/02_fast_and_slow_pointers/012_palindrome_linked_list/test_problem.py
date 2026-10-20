from list_node import ListNode
from solution import is_palindrome


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def test_is_palindrome_true():
    assert is_palindrome(build_list([1, 2, 2, 1]))


def test_is_palindrome_odd_true():
    assert is_palindrome(build_list([1, 2, 3, 2, 1]))


def test_is_palindrome_false():
    assert not is_palindrome(build_list([1, 2]))


def test_is_palindrome_single():
    assert is_palindrome(build_list([1]))
