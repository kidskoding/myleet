from list_node import ListNode
from solution import odd_even_list


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_odd_even_list_basic():
    head = build_list([1, 2, 3, 4, 5])
    assert to_list(odd_even_list(head)) == [1, 3, 5, 2, 4]


def test_odd_even_list_even_length():
    head = build_list([2, 1, 3, 5, 6, 4, 7])
    assert to_list(odd_even_list(head)) == [2, 3, 6, 7, 1, 5, 4]
